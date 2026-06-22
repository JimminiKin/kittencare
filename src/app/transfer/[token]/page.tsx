import { TransferAcceptView } from "@/features/transfer/transfer-accept-view";

export default async function TransferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <TransferAcceptView token={token} />;
}
