import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Dashboard | PT Aneka Mitra Gemilang - Sign In"
        description="Dashboard Sign In PT Aneka Mitra Gemilang"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
