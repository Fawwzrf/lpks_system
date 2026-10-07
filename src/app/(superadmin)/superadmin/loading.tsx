import { PageSkeleton } from "@/components/ui/skeleton";

export default function SuperadminLoading() {
  return <PageSkeleton hasCards={true} cardCount={4} tableRows={8} />;
}
