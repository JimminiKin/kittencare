import { InviteView } from "@/features/invite/invite-view";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InviteView token={token} />;
}
