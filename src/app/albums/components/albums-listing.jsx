import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import Link from "next/link";
import { Input } from "@/components/ui/input"; // Assuming you have a reusable Input component
import Papa from "papaparse"; // For CSV parsing
import * as XLSX from "xlsx"; // For XLSX parsing

const AlbumsListing = ({ data: dataFromQL }) => {
  const [data, setData] = useState(dataFromQL.albums.data);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const [previewData, setPreviewData] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  const columns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
            />
          </div>
        ),
      },
      {
        accessorKey: "title",
        header: "Title",
        enableColumnFilter: true,
      },
      {
        id: "id",
        header: "id",
        cell: ({ row }) => (
          <Link href={`/albums/${row.original.id}`} className="text-blue-500">
            View Details
          </Link>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    columns,
    data: data,
    state: {
      globalFilter,
      rowSelection,
    },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    enableGlobalFilter: true,
  });

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    const fileExtension = file.name.split(".").pop();
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;

      if (fileExtension === "csv") {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const validatedData = validateData(results.data);
            console.log("validatedData", validatedData);
            setPreviewData(validatedData);
          },
        });
      } else if (fileExtension === "xlsx") {
        const workbook = XLSX.read(text, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        const validatedData = validateData(jsonData);
        setPreviewData(validatedData);
      }
    };

    reader.readAsText(file);
  };

  const validateData = (data) => {
    return data.filter((item) => {
      // Add your validation logic here, e.g.:
      return item.title; // Ensure 'title' and 'artist' fields exist
    });
  };

  const handleFinalizeImport = () => {
    console.log("Finalizing import with data:", previewData);
    setData([...previewData, ...data]);
    // Here you can call an API to save the data
    setPreviewData([]);
    setSelectedFile(null); // Clear the selected file state
    document.getElementById("fileInput").value = "";
  };

  const handleBulkDelete = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const selectedRowIds = selectedRows.map((row) => row.original.id);
    console.log(selectedRowIds);
  };

  return (
    <div>
      <div className="flex items-center justify-end">
        <div className="flex items-center mb-4 ">
          <p className="text-sm mr-2">Import CSV File:</p>
          <Input
            id="fileInput"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="w-60"
          />
        </div>
        {selectedFile && (
          <button
            onClick={handleFinalizeImport}
            className="mb-4 bg-green-500 whitespace-nowrap ml-2 text-white p-2 rounded"
          >
            Finalize Import
          </button>
        )}
      </div>
      {previewData.length > 0 && (
        <div>
          <h3>Preview Imported Albums:</h3>
          <table className="min-w-full border-collapse border border-gray-200">
            <thead>
              <tr>
                {columns.slice(0, 1).map((column) => (
                  <th key={column.id} className="border border-gray-300 p-2">
                    {column.header}
                  </th>
                ))}
                <th className="border border-gray-300 p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, index) => (
                <tr key={index}>
                  {columns.slice(0, 1).map((column) => (
                    <td key={column.id} className="border border-gray-300 p-2">
                      <Input
                        value={row[column.accessorKey]}
                        onChange={(e) => {
                          const newData = [...previewData];
                          newData[index][column.accessorKey] = e.target.value;
                          setPreviewData(newData);
                        }}
                      />
                    </td>
                  ))}
                  <td className="border border-gray-300 p-2 flex justify-center">
                    <button
                      onClick={() => {
                        const newData = previewData.filter(
                          (_, i) => i !== index
                        );
                        setPreviewData(newData);
                      }}
                      className="bg-red-500 text-white p-1 rounded"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Input
        placeholder="Search Albums..."
        value={globalFilter || ""}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="mb-4"
      />
      {table.getSelectedRowModel().rows.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleBulkDelete}
            className="mb-4 bg-red-500 text-white p-2 rounded"
          >
            Delete Selected
            
          </button>
        </div>
      )}
      <table className="min-w-full border-collapse border border-gray-200">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="border border-gray-300 p-2">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="border border-gray-300 p-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AlbumsListing;