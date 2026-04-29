/**
 * naiveBayesService.js
 * ─────────────────────────────────────────────────────────────────
 * Naive Bayes Scholarship Recommendation Engine
 *
 * Formula:
 *   P(Scholarship | UserData) ∝ P(Scholarship) × ∏ P(feature_i | Scholarship)
 *
 * Because P(UserData) is constant across all scholarships, we drop it
 * and rank purely by the numerator (prior × product of likelihoods).
 *
 * Laplace (add-1) smoothing is applied to every categorical feature so
 * that an unseen value never collapses the entire product to zero.
 *
 * Numeric features (marks, income) are discretised into equal-width
 * bins so the same Laplace-smoothed counting approach works for them.
 * ─────────────────────────────────────────────────────────────────
 */

// ── Constants ────────────────────────────────────────────────────

/** Number of equal-width bins used for numeric features. */
const NUMERIC_BINS = 5;

/** Laplace smoothing factor (α). 1 is the classic add-one value. */
const LAPLACE_ALPHA = 1;

// ── Numeric helpers ──────────────────────────────────────────────

/**
 * Compute the global min/max for a numeric field across all scholarships.
 * Returns { min, max }.
 */
function computeNumericRange(scholarships, field) {
  const values = scholarships
    .map((s) => parseFloat(s[field]))
    .filter((v) => !isNaN(v));

  if (values.length === 0) return { min: 0, max: 1 };
  return { min: Math.min(...values), max: Math.max(...values) };
}

/**
 * Discretise a numeric value into a bin index (0 … NUMERIC_BINS-1).
 * Values outside [min, max] are clamped to the nearest edge bin.
 */
function discretise(value, min, max, bins = NUMERIC_BINS) {
  if (max === min) return 0; // degenerate range → single bin
  const clamped = Math.max(min, Math.min(max, parseFloat(value)));
  const idx = Math.floor(((clamped - min) / (max - min)) * bins);
  return Math.min(idx, bins - 1); // ensure last edge maps to last bin
}

// ── Training ─────────────────────────────────────────────────────

/**
 * Build a model from the scholarship collection.
 *
 * The model shape:
 * {
 *   total: <number of scholarships>,
 *   priors: { [scholarshipId]: probability },
 *   likelihoods: {
 *     [scholarshipId]: {
 *       [feature]: { [value]: smoothed_probability }
 *     }
 *   },
 *   ranges: { marks: {min,max}, income: {min,max} },
 *   vocabulary: { [feature]: Set<string> }   ← all seen values per feature
 * }
 *
 * @param {Array}  scholarships  – raw Mongoose documents / plain objects
 * @returns {Object} model
 */
function trainModel(scholarships) {
  if (!scholarships || scholarships.length === 0) {
    return { total: 0, priors: {}, likelihoods: {}, ranges: {}, vocabulary: {} };
  }

  // Categorical features we care about
  const CATEGORICAL_FEATURES = ["education", "category", "gender", "location"];
  // Numeric features (will be binned)
  const NUMERIC_FEATURES = ["marks", "income"];

  // 1. Compute global numeric ranges for binning
  const ranges = {};
  for (const feat of NUMERIC_FEATURES) {
    ranges[feat] = computeNumericRange(scholarships, feat);
  }

  // 2. Build global vocabulary (all values seen per feature)
  //    This ensures the denominator in Laplace smoothing is correct
  //    even for values not present in a particular scholarship's slice.
  const vocabulary = {};
  for (const feat of CATEGORICAL_FEATURES) {
    vocabulary[feat] = new Set();
  }
  for (const feat of NUMERIC_FEATURES) {
    vocabulary[feat] = new Set();
    for (let bin = 0; bin < NUMERIC_BINS; bin++) {
      vocabulary[feat].add(String(bin));
    }
  }
  for (const s of scholarships) {
    for (const feat of CATEGORICAL_FEATURES) {
      const val = normalise(s[feat]);
      if (val !== null) vocabulary[feat].add(val);
    }
  }

  // 3. Count feature occurrences per scholarship
  const counts = {}; // counts[id][feat][val] = n
  const featureTotals = {}; // featureTotals[id][feat] = total observations

  for (const s of scholarships) {
    const id = String(s._id);
    counts[id] = {};
    featureTotals[id] = {};

    for (const feat of CATEGORICAL_FEATURES) {
      counts[id][feat] = {};
      featureTotals[id][feat] = 0;
      const val = normalise(s[feat]);
      if (val !== null) {
        counts[id][feat][val] = (counts[id][feat][val] || 0) + 1;
        featureTotals[id][feat] += 1;
      }
    }

    for (const feat of NUMERIC_FEATURES) {
      counts[id][feat] = {};
      featureTotals[id][feat] = 0;
      const raw = parseFloat(s[feat]);
      if (!isNaN(raw)) {
        const bin = String(discretise(raw, ranges[feat].min, ranges[feat].max));
        counts[id][feat][bin] = (counts[id][feat][bin] || 0) + 1;
        featureTotals[id][feat] += 1;
      }
    }
  }

  // 4. Convert counts → Laplace-smoothed likelihoods
  const likelihoods = {};
  const allFeatures = [...CATEGORICAL_FEATURES, ...NUMERIC_FEATURES];

  for (const s of scholarships) {
    const id = String(s._id);
    likelihoods[id] = {};

    for (const feat of allFeatures) {
      likelihoods[id][feat] = {};
      const vocabSize = vocabulary[feat].size;
      const total = featureTotals[id][feat] || 0;

      for (const val of vocabulary[feat]) {
        const count = counts[id][feat][val] || 0;
        // Laplace-smoothed probability: (count + α) / (total + α × |V|)
        likelihoods[id][feat][val] =
          (count + LAPLACE_ALPHA) / (total + LAPLACE_ALPHA * vocabSize);
      }
    }
  }

  // 5. Prior: uniform — each scholarship equally likely before evidence
  //    Can be replaced with domain-specific priors (e.g., application rate).
  const priors = {};
  const total = scholarships.length;
  for (const s of scholarships) {
    priors[String(s._id)] = 1 / total;
  }

  return { total, priors, likelihoods, ranges, vocabulary };
}

// ── Inference ────────────────────────────────────────────────────

/**
 * Score all scholarships for a given user profile.
 *
 * @param {Object} userProfile  – plain object with user fields
 * @param {Array}  scholarships – same array used for training
 * @param {Object} model        – output of trainModel()
 * @returns {Array} scholarships sorted by descending probability score,
 *                  each augmented with { _score, _rank }
 */
function scoreScholarships(userProfile, scholarships, model) {
  if (!model || model.total === 0) return [];

  const CATEGORICAL_FEATURES = ["education", "category", "gender", "location"];
  const NUMERIC_FEATURES = ["marks", "income"];

  // Pre-process user features once
  const userCategorical = {};
  for (const feat of CATEGORICAL_FEATURES) {
    userCategorical[feat] = normalise(userProfile[feat]);
  }

  const userNumeric = {};
  for (const feat of NUMERIC_FEATURES) {
    const raw = parseFloat(userProfile[feat]);
    userNumeric[feat] = isNaN(raw)
      ? null
      : String(discretise(raw, model.ranges[feat].min, model.ranges[feat].max));
  }

  const scored = scholarships.map((s) => {
    const id = String(s._id);
    const prior = model.priors[id] ?? 1 / model.total;
    const featLikelihoods = model.likelihoods[id] ?? {};

    // Work in log-space to avoid floating-point underflow
    let logScore = Math.log(prior);

    // Categorical features
    for (const feat of CATEGORICAL_FEATURES) {
      const userVal = userCategorical[feat];
      if (userVal === null) continue; // missing user field → skip feature

      const featDist = featLikelihoods[feat] ?? {};
      // Use Laplace floor when the value wasn't in vocabulary at train time
      const vocabSize = model.vocabulary[feat]?.size ?? 1;
      const prob =
        featDist[userVal] ?? LAPLACE_ALPHA / (LAPLACE_ALPHA * vocabSize);
      logScore += Math.log(prob);
    }

    // Numeric features
    for (const feat of NUMERIC_FEATURES) {
      const userBin = userNumeric[feat];
      if (userBin === null) continue;

      const featDist = featLikelihoods[feat] ?? {};
      const prob =
        featDist[userBin] ?? LAPLACE_ALPHA / (LAPLACE_ALPHA * NUMERIC_BINS);
      logScore += Math.log(prob);
    }

    return {
      ...toPlainObject(s),
      _score: logScore,
    };
  });

  // Sort descending by log-score (higher = more likely match)
  scored.sort((a, b) => b._score - a._score);

  // Attach human-readable rank
  return scored.map((s, i) => ({ ...s, _rank: i + 1 }));
}

// ── Utilities ────────────────────────────────────────────────────

/**
 * Normalise a field value to a lowercase trimmed string, or null if absent.
 */
function normalise(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value).toLowerCase().trim();
}

/**
 * Convert a Mongoose document (or plain object) to a serialisable POJO.
 * Safely handles both .toObject() and plain objects.
 */
function toPlainObject(doc) {
  if (doc && typeof doc.toObject === "function") return doc.toObject();
  return { ...doc };
}

// ── Public API ───────────────────────────────────────────────────

module.exports = { trainModel, scoreScholarships };