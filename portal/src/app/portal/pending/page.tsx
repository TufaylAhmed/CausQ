import { AuthScene } from "@/components/AuthScene";

export default function PendingPage() {
  return (
    <AuthScene
      kicker="Awaiting approval"
      title="Your account is being reviewed"
      foot={
        <>
          Have an invite code?{" "}
          <a className="font-medium text-[var(--signal-deep)] underline underline-offset-4" href="/portal/invite">
            Redeem it here
          </a>
        </>
      }
    >
      <div className="panel p-5">
        <p className="text-sm leading-relaxed text-[var(--ink-mute)]">
          You will get access the moment a CausQ administrator approves your
          account. This usually happens quickly. You can close this tab and come
          back later, you will stay signed in.
        </p>
      </div>
    </AuthScene>
  );
}
