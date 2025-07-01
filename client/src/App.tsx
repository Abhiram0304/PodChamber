import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './components/Home'
import Room from './components/Room'

const App = () => {
  return (
    <div className='bg-gray-900 text-white min-h-screen flex flex-col max-w-screen overflow-x-hidden'>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room" element={<Room />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App