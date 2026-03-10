import { useContext } from 'react'
import { AuthCtx } from './authContext'

export function useAuth() {
  return useContext(AuthCtx)
}
