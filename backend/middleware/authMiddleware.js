/**
 * authMiddleware.js
 * ─────────────────────────────────────────────────────────────────
 * Two middleware exports:
 *
 *  protect         — Hard-require auth. Returns 401 if userId missing.
 *                    Use on routes guests must NOT access (e.g. POST /apply).
 *
 *  optionalProtect — Soft auth. Attaches req.user if userId present,
 *                    otherwise continues as guest (req.user = null).
 *                    Use on routes guests CAN access (e.g. GET /api/scholarships).
 *
 * userId is read from (in priority order):
 *   1. req.headers["x-user-id"]   — sent by frontend axios default headers
 *   2. req.query.userId            — URL query param fallback
 * ─────────────────────────────────────────────────────────────────
 */

/**
 * Hard auth guard — blocks guests with 401.
 * Use on: POST /auth/applications/:id, GET /api/scholarships/recommendations
 */
const protect = (req, res, next) => {
  const userId =
    req.headers["x-user-id"] ||
    req.query.userId          ||
    null;

  if (!userId) {
    return res.status(401).json({
      status:  false,
      message: "Unauthorized: Please login to perform this action.",
    });
  }

  req.user = { _id: userId };
  next();
};

/**
 * Soft auth guard — never blocks, but enriches req.user if logged in.
 * Use on: GET /api/scholarships (public, but we still want to know who's asking)
 */
const optionalProtect = (req, res, next) => {
  const userId =
    req.headers["x-user-id"] ||
    req.query.userId          ||
    null;

  req.user = userId ? { _id: userId } : null;
  next();
};

module.exports = { protect, optionalProtect };