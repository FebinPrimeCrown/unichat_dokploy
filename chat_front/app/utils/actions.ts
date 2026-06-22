'use server'
import {cookies} from 'next/headers'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache';


export async function DetectRefreshToken(){
  noStore()
  const cookieStore = cookies()
  const refresh_token = cookieStore.get('refresh_token')?.value
  if (refresh_token){
    return refresh_token
  }
  return false
}

export async function DetectAdminRefreshToken(){
  noStore()
  const cookieStore = cookies()
  const refresh_token = cookieStore.get('admin_refresh_token')?.value
  if (refresh_token){
    return refresh_token
  }
  return false
}

export async function DetectAccessToken(){
  noStore()
  const cookieStore = cookies()
  const access_token = cookieStore.get('token')?.value
  if (access_token){
    return true
  }
  return false
}

export async function extractRolesFromToken() {
  noStore()
  const cookieStore = cookies()
  const token = cookieStore.get('refresh_token')?.value
  if(!token){
    return []
  }

  const base64Url = token?.split('.')[1]; // Get the payload part of the JWT
  const base64 = base64Url?.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64) 
      .split('')
      .map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join('')
  );
  const decoded_token = JSON.parse(jsonPayload);
  console.log(decoded_token.roles)
  return decoded_token.roles
}

export async function extractIsAdminFromToken() {
  noStore()
  const cookieStore = cookies()
  const token = cookieStore.get('refresh_token')?.value
  if(!token){
    return []
  }

  const base64Url = token?.split('.')[1]; // Get the payload part of the JWT
  const base64 = base64Url?.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64) 
      .split('')
      .map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join('')
  );
  const decoded_token = JSON.parse(jsonPayload);
  return decoded_token.hasOwnProperty("for_admin_use") ? true : false;
}