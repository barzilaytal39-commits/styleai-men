import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from '@/routes/AppRouter'
import { Toaster } from '@/components/ui/toaster'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster>
        <AppRouter />
      </Toaster>
    </BrowserRouter>
  )
}
