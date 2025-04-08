import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Define the structure of our parsed Excel data
interface ExcelRow {
  id?: number;
  category: string;
  requirement: string;
  finalResponse?: string;
  timestamp?: string;
  rating?: number;
}

export default function ViewData() {
  const [loading, setLoading] = useState(true);
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);

  useEffect(() => {
    // Fetch the data from the API
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/excel-requirements");
        if (response.ok) {
          const data = await response.json();
          setExcelData(data);
        } else {
          console.error("Failed to fetch data");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="h-full">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">View Uploaded Data</h2>
        
        <Card>
          <div className="px-6 py-5 border-b border-slate-200">
            <h3 className="text-lg font-medium text-slate-800">Requirement Data</h3>
            <p className="mt-1 text-sm text-slate-500">
              All uploaded Excel requirements are displayed below.
            </p>
          </div>
          
          <CardContent className="p-0 overflow-auto">
            {loading ? (
              <div className="p-6 text-center">Loading...</div>
            ) : excelData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Requirement</TableHead>
                    <TableHead>Final Response</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {excelData.map((row, index) => (
                    <TableRow key={row.id || index}>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.requirement}</TableCell>
                      <TableCell>{row.finalResponse || "—"}</TableCell>
                      <TableCell>{row.rating !== undefined ? row.rating : "—"}</TableCell>
                      <TableCell>{row.timestamp || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center">
                <p className="text-slate-500">No data available. Please upload Excel files first.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}