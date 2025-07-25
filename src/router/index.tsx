import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from '../App'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
])

const Router = () => {
  return <RouterProvider router={router} />
}

export default Router
