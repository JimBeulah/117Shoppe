import { SignUp } from "@clerk/nextjs"

export const metadata = {
  title: "Create Account",
}

export default function SignUpPage() {
  return <SignUp />
}
