import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './components/Home'
import Room from './components/Room'
import Recordings from './components/Recordings'
import NavBar from './components/NavBar'
import About from './components/About'

const App = () => {
  return (
    <div className='bg-gray-900 overflow-hidden text-white min-h-screen flex flex-col max-w-screen overflow-x-hidden'>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room" element={<Room />} />
          <Route path='/recordings' element={<Recordings />} />
          <Route path='/about' element={<About />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App