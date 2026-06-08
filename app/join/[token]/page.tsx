import { PlatformApp } from "@/components/PlatformApp";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PlatformApp inviteToken={token} />;
}
