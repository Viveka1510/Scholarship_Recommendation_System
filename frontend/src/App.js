import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./components/Navbar";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Form from "./pages/Form";
import Result from "./pages/Result";
import Profile from "./pages/Profile";

function App(){

return(

<BrowserRouter>

<Navbar/>

<Routes>

<Route path="/" element={<Login/>}/>

<Route path="/login" element={<Login/>}/>

<Route path="/register" element={<Register/>}/>

<Route path="/form" element={<Form/>}/>

<Route path="/result" element={<Result/>}/>

<Route path="/profile" element={<Profile/>}/>

</Routes>

<ToastContainer
position="top-right"
autoClose={1200}
hideProgressBar={true}
closeOnClick
pauseOnHover={false}
/>

</BrowserRouter>

)

}

export default App;