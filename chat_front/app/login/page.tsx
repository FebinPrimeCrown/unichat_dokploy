import React, {Suspense} from 'react'
import LoginPage from './NewLoginForm'

const Login = async() => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPage />
    </Suspense>
  )
}

export default Login
