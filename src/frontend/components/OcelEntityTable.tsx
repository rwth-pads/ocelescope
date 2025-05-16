import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { OcelEntity, PaginatedResponse } from "@/api/fastapi-schemas";
import { useRouter } from "next/router";

type OcelEntityTableProps = {
  paginatedResponse: PaginatedResponse;
};

const OcelEntityTable: React.FC<OcelEntityTableProps> = ({
  paginatedResponse,
}) => {
  const router = useRouter();
  const page = paginatedResponse.page;
  const totalPages = paginatedResponse.total_pages;

  const attributeKeys = Array.from(
    new Set(
      paginatedResponse.items.flatMap((item) => Object.keys(item.attributes)),
    ),
  );

  const relationKeys = Array.from(
    new Set(
      paginatedResponse.items.flatMap((item) => Object.keys(item.relations)),
    ),
  );

  const columns: ColumnDef<OcelEntity>[] = [
    {
      header: "ID",
      accessorKey: "id",
    },
    {
      header: "Timestamp",
      accessorKey: "timestamp",
      cell: (info) => info.getValue() ?? "—",
    },
    ...attributeKeys.map((key) => ({
      header: key,
      id: `attr.${key}`,
      accessorFn: (row) => row.attributes[key],
    })),
    ...relationKeys.map((key) => ({
      header: key,
      id: `rel.${key}`,
      accessorFn: (row) => row.relations[key]?.join(", ") ?? "—",
    })),
  ];

  const table = useReactTable({
    data: paginatedResponse.items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const goToPage = (newPage: number) => {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("page", newPage.toString());
    router.push(`${router.pathname}?${searchParams.toString()}`, undefined, {
      shallow: true,
    });
  };

  return (
    <div className="space-y-4 w-full">
      <div className="w-full table-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OcelEntityTable;
