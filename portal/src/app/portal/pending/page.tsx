export default function PendingPage() {
  return (
    <main className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-brand-deep">CausQ</p>
        <h1 className="mt-2 text-2xl font-semibold">Awaiting approval</h1>
        <p className="mt-2 max-w-md text-neutral-500">
          Your account is being reviewed. You will get access once a CausQ administrator
          approves it. Have an invite code?{" "}
          <a className="underline" href="/portal/invite">
            Redeem it here
          </a>
          .
        </p>
      </div>
    </main>
  );
}
