import { useState } from "react";
import {
  MessageSquare,
  Search,
  Loader2,
  Calendar,
  User,
  Phone,
  Mail,
  Star,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchFeedbacks, type StudentFeedback } from "@/services/api/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export default function FeedbackPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 15;

  const [selectedFeedback, setSelectedFeedback] = useState<StudentFeedback | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["student-feedbacks", page, debouncedSearch],
    queryFn: ({ signal }) => fetchFeedbacks({ page, limit: perPage, search: debouncedSearch }, signal),
    placeholderData: (prev) => prev,
  });

  const feedbacks = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    setDebouncedSearch(val.trim());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Student Feedback</h1>
          <p className="text-sm text-muted-foreground">
            Review feedback, feature requests, and suggestions submitted by mobile app students.
          </p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search feedback or student…"
            value={search}
            onChange={handleSearchChange}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border rounded-xl bg-card">
          <MessageSquare className="h-10 w-10 mb-2 opacity-30" />
          <p className="text-sm font-medium">No feedback entries found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {debouncedSearch ? "Try adjusting your search query." : "When students submit feedback in the mobile app, it will appear here."}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium text-muted-foreground">Student</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Feedback Message</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Rating</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="p-3 text-right font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div>
                        <p className="font-semibold">{item.studentName || "Anonymous Student"}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {item.studentPhone || item.studentEmail || `ID: ${item.studentId?.slice(0, 8)}...`}
                        </p>
                      </div>
                    </td>
                    <td className="p-3 max-w-md">
                      <p className="truncate text-foreground/90 font-normal">
                        {item.message}
                      </p>
                      {item.category && (
                        <Badge variant="outline" className="text-[10px] mt-1">
                          {item.category}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      {item.rating ? (
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          <span className="text-xs font-semibold">{item.rating}/5</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => setSelectedFeedback(item)}
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <span>
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total} feedback entries
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <span className="px-2 font-medium text-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Feedback Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={(v) => !v && setSelectedFeedback(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Student Feedback Details
            </DialogTitle>
            <DialogDescription>
              Submitted on {selectedFeedback ? new Date(selectedFeedback.createdAt).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4 py-2">
              {/* Student info box */}
              <div className="rounded-lg border bg-muted/40 p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>Student Name</span>
                  </div>
                  <p className="font-semibold text-foreground text-sm">
                    {selectedFeedback.studentName || "Anonymous"}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>Contact Phone</span>
                  </div>
                  <p className="font-mono text-foreground">
                    {selectedFeedback.studentPhone || "—"}
                  </p>
                </div>
                {selectedFeedback.studentEmail && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>Email</span>
                    </div>
                    <p className="text-foreground">{selectedFeedback.studentEmail}</p>
                  </div>
                )}
                {selectedFeedback.rating && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Star className="h-3.5 w-3.5" />
                      <span>Rating</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < selectedFeedback.rating! ? "fill-current" : "opacity-25"
                          }`}
                        />
                      ))}
                      <span className="font-semibold ml-1 text-foreground">
                        {selectedFeedback.rating}/5
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Box */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Feedback Message
                </div>
                <div className="rounded-lg border bg-card p-4 text-sm whitespace-pre-wrap leading-relaxed">
                  {selectedFeedback.message}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setSelectedFeedback(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
