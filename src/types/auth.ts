export interface LoginPayload {
  loginName: string
  password: string
  code?: string
  uuid?: string
}

export interface LoginUser {
  id: number | string
  loginName: string
  username?: string
  roleName?: string
}

export interface LoginResponseData {
  msgTip: string
  token?: string
  user?: LoginUser
  pwdSimple?: boolean
}

export interface ApiResponse<T> {
  code: number
  data: T
  message?: string
}

export interface CaptchaData {
  uuid: string
  base64: string
}
