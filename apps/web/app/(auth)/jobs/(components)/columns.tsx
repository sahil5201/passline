"use client"

import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import { deleteJobAction, toggleQueueJobAction } from "@/app/actions/jobs"
import { ScoreBadge } from "@/components/score-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { DataTableFeatures } from "./table-features"
import { ArrowUpDown } from "lucide-react"

export type JobApplication = {
    id: string
    title: string
    company: string | null
    status: "saved" | "queued" | "analyzed"
    score: number | null
}

export const columns: ColumnDef<DataTableFeatures, JobApplication>[] = [
    {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
            <Link href={`/jobs/${row.original.id}`} className="font-medium hover:underline">
                {row.original.title}
            </Link>
        ),
    },
    {
        accessorKey: "company",
        header: "Company",
        cell: ({ row }) => row.original.company ?? "—",
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
    },
    {
        accessorKey: "score",
        header: ({ column }) => (
            <Button
                variant="ghost"
                size="sm"
                onClick={column.getToggleSortingHandler()}
            >
                Score
                <ArrowUpDown className="ml-2 size-4" />
            </Button>
        ),
        cell: ({ row }) => <ScoreBadge score={row.original.score} />,
        sortFn: (rowA, rowB, columnId) => {
            const a = rowA.getValue<number | null>(columnId)
            const b = rowB.getValue<number | null>(columnId)
            if (a == null && b == null) return 0
            if (a == null) return -1 // null counts as lowest
            if (b == null) return 1
            return a - b
        },
    },
    // {
    //     id: "queue",
    //     header: "Queue",
    //     cell: ({ row }) => {
    //         const queued = row.original.status === "queued"
    //         return (
    //             <form action={toggleQueueJobAction}>
    //                 <input type="hidden" name="id" value={row.original.id} />
    //                 <input type="hidden" name="queued" value={queued ? "false" : "true"} />
    //                 <Button type="submit" size="xs" variant="outline">
    //                     {queued ? "Unqueue" : "Queue"}
    //                 </Button>
    //             </form>
    //         )
    //     },
    // },
    {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
            <div className="text-right">
                <form action={deleteJobAction} className="inline">
                    <input type="hidden" name="id" value={row.original.id} />
                    <Button type="submit" size="xs" variant="destructive">
                        Delete
                    </Button>
                </form>
            </div>
        ),
    },
]