import { SignIn, SignUp } from '@clerk/react';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

const cardAppearance = {
  variables: {
    colorPrimary: '#5b49e8',
    colorForeground: '#282441',
    colorMutedForeground: '#77738a',
    colorDanger: '#cf5364',
    colorBackground: '#fffefd',
    colorInput: '#fbfaff',
    colorInputForeground: '#282441',
    colorNeutral: '#e2dff0',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '1.1rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fffefd] rounded-[28px] w-[440px] max-w-full overflow-hidden border border-[#e8e4f2] shadow-[0_22px_80px_rgba(60,45,145,.14)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-[Space_Grotesk] !text-[#282441] !font-bold',
    headerSubtitle: '!text-[#77738a]',
    socialButtonsBlockButtonText: '!text-[#39334f] !font-bold',
    formFieldLabel: '!text-[#514b71] !font-bold',
    footerActionLink: '!text-[#5b49e8] !font-bold',
    footerActionText: '!text-[#77738a]',
    dividerText: '!text-[#9d99b2]',
    formButtonPrimary: '!bg-[#5b49e8] hover:!bg-[#4e3bd5] !rounded-full !font-bold',
    formFieldInput: '!bg-[#fbfaff] !border-[#e2dff0] !rounded-xl !text-[#282441]',
    socialButtonsBlockButton: '!bg-[#f5f2ff] !border-[#e7e2fa] !rounded-xl hover:!bg-[#efebff]',
    main: 'px-1',
  },
};

export function SignInPage() {
  return (
    <div className="merchant-grid flex min-h-[100dvh] items-center justify-center bg-[#f8f8fc] px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 text-center">
          <a href={`${basePath || ''}/`} className="inline-flex items-center gap-2.5 text-[#211c42]" data-testid="link-auth-logo">
            <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#5b49e8] text-white shadow-[0_8px_20px_rgba(91,73,232,.24)]">
              <span className="font-[Space_Grotesk] text-xl font-bold">F</span>
            </span>
            <span className="font-[Space_Grotesk] text-2xl font-bold tracking-[-.07em]">Fiaba</span>
          </a>
          <p className="mt-3 text-xs font-bold uppercase tracking-[.18em] text-[#8b88a0]">Le commerce avance ensemble</p>
        </div>
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} appearance={cardAppearance} />
      </div>
    </div>
  );
}

export function SignUpPage() {
  return (
    <div className="merchant-grid flex min-h-[100dvh] items-center justify-center bg-[#f8f8fc] px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 text-center">
          <a href={`${basePath || ''}/`} className="inline-flex items-center gap-2.5 text-[#211c42]" data-testid="link-auth-logo-signup">
            <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#5b49e8] text-white shadow-[0_8px_20px_rgba(91,73,232,.24)]"><span className="font-[Space_Grotesk] text-xl font-bold">F</span></span>
            <span className="font-[Space_Grotesk] text-2xl font-bold tracking-[-.07em]">Fiaba</span>
          </a>
          <p className="mt-3 text-xs font-bold uppercase tracking-[.18em] text-[#8b88a0]">Votre réseau, votre mouvement</p>
        </div>
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} appearance={cardAppearance} />
      </div>
    </div>
  );
}