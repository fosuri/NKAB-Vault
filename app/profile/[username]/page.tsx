import { notFound } from "next/navigation";

interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function UserProfilePage({ params }: ProfilePageProps) {
  const resolvedParams = await params;
  
  if (!resolvedParams.username) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10 px-4 mt-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4">It is {decodeURIComponent(resolvedParams.username)} profile</h1>
      <p className="mb-8 max-w-lg text-center text-red-500">
        DODELAT profile nado!!!!
      </p>
    </div>
  );
}
