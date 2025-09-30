"use client";

import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";

interface InvoiceProps {
    data: {
        name: string;
        phone: string;
        service: string;
        message: string;
        invoiceNumber?: string;
    };
    onClose: () => void;
}

export default function Invoice({ data, onClose }: InvoiceProps) {
    const handleDownloadPDF = () => {
        const doc = new jsPDF("p", "mm", "a4");

        const primaryColor: [number, number, number] = [41, 128, 185];
        const textColor: [number, number, number] = [40, 40, 40];
        const lightGray: [number, number, number] = [200, 200, 200];

        // Title
        doc.setFontSize(20);
        doc.text("Invoice", 105, 20, { align: "center" });




        // Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 40, "F");
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text("INVOICE", 105, 25, { align: "center" });


        // Company info
        doc.setFontSize(10);
        doc.text("Your Company Name", 20, 15);
        doc.text("www.yourcompany.com", 20, 20);
        doc.text("support@yourcompany.com", 20, 25);



        //  // Invoice Number
        
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text(`Invoice No: ${data.invoiceNumber || "INV-XXXX"}`, 20, 30);


        //  // Date
        doc.setFontSize(12);
        doc.setTextColor(...textColor);
        doc.text(`Date: ${formatDate(new Date())}`, 160, 30);



        // Customer info
        doc.text("Bill To:", 20, 75);
        doc.text(`Name: ${data.name}`, 20, 50);
        doc.text(`Phone: ${data.phone}`, 20, 60);
        doc.text(`Service: ${data.service}`, 20, 70);
        if (data.message) {
            doc.text(`Message: ${data.message}`, 20, 80);
        }
        doc.text(`Date: ${formatDate(new Date())}`, 20, 90);

        // Table header
        doc.setDrawColor(...lightGray);
        doc.line(20, 125, 190, 125);
        doc.text("Description", 20, 135);
        doc.text("Amount", 160, 135);
        doc.line(20, 140, 190, 140);

        // Table row
        const price = 100;
        doc.text((data.service), 20, 150);
        doc.text(`$${(price)}`, 160, 150);
        doc.line(20, 160, 190, 160);


        // Total
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.text("Total:", 130, 170);
        doc.text(`$${(price)}`, 160, 170);



        // Footer
        doc.setFontSize(10);
        doc.setTextColor(...textColor);
        doc.text("Thank you for your business!", 105, 285, { align: "center" }); 

        doc.save(`${data.invoiceNumber || "Invoice"}.pdf`);
    };

    const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-lg mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-center">Invoice Preview</h2>
            <p><strong>Invoice No:</strong> {data.invoiceNumber}</p>
            <p><strong>Name:</strong> {data.name}</p>
            <p><strong>Phone:</strong> {data.phone}</p>
            <p><strong>Service:</strong> {data.service}</p>
            {data.message && <p><strong>Message:</strong> {data.message}</p>}
            <p><strong>Date:</strong> {formatDate(new Date())}</p>

            <p className="text-right font-semibold mt-4">
                Amount Due: <span className="text-blue-600">$100</span>
            </p>

            <div className="flex justify-between mt-6">
                <Button onClick={handleDownloadPDF}>Download PDF</Button>
                <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
        </div>
    );
}
