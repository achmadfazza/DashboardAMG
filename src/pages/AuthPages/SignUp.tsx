import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Dashboard | PT Aneka Mitra Gemilang - Sign Up"
        description="Dashboard Sign Up PT Aneka Mitra Gemilang"
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
