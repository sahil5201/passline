import { Loader2 } from "lucide-react";

export default function LoadingPage() {
  return <div className="flex flex-1 items-center justify-center">
    <Loader2 className="size-14 animate-spin" />
  </div>
}