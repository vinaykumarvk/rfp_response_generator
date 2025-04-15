import { ExcelRequirementResponse } from "@shared/schema";
import { 
  Document, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType, 
  BorderStyle,
  Packer
} from 'docx';
import * as XLSX from 'xlsx';

/**
 * Generates a DOCX file from the response data and returns it as a Blob
 */
export const generateDocxFile = async (items: ExcelRequirementResponse[]): Promise<Blob> => {
  // Group by RFP Name
  const itemsByRfpName: Record<string, ExcelRequirementResponse[]> = {};
  items.forEach((item) => {
    const rfpName = item.rfpName || "Unnamed RFP";
    if (!itemsByRfpName[rfpName]) {
      itemsByRfpName[rfpName] = [];
    }
    itemsByRfpName[rfpName].push(item);
  });

  // Create document with sections
  const sections = [];
  
  // Title section
  sections.push({
    properties: {},
    children: [
      // Title
      new Paragraph({
        text: "RFP Response Report",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 0,
          after: 400, // 20pt after
        },
      })
    ]
  });
  
  // Generate content for each RFP
  for (const [rfpName, rfpItems] of Object.entries(itemsByRfpName)) {
    // Get date from most recent item
    const latestItem = [...rfpItems].sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA;
    })[0];
    
    const date = latestItem?.timestamp
      ? new Date(latestItem.timestamp).toLocaleDateString()
      : new Date().toLocaleDateString();
      
    // RFP section
    sections.push({
      properties: {},
      children: [
        new Paragraph({
          text: rfpName,
          heading: HeadingLevel.HEADING_2,
          spacing: {
            before: 300, // 15pt before
          },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Date: ${date}`,
              italics: true,
              color: "666666",
            }),
          ],
          spacing: {
            after: 300, // 15pt after
          },
        }),
        
        // Add each requirement and its response
        ...rfpItems.flatMap((item, index) => {
          const paragraphs = [];
          
          // Requirement header
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Requirement ${index + 1}: `,
                  bold: true,
                }),
                new TextRun({
                  text: item.requirement || "No requirement text",
                  bold: true,
                  color: "4F46E5",
                }),
              ],
              heading: HeadingLevel.HEADING_3,
              spacing: {
                before: 400, // 20pt before
              },
            })
          );
          
          // Category if exists
          if (item.category) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Category: ${item.category}`,
                    italics: true,
                    color: "666666",
                  }),
                ],
                spacing: {
                  after: 200, // 10pt after
                },
              })
            );
          }
          
          // Response content or placeholder
          if (item.finalResponse) {
            // Split response into paragraphs and process
            const responseParagraphs = item.finalResponse.split("\n\n");
            responseParagraphs.forEach(paragraph => {
              if (paragraph.trim()) {
                paragraphs.push(
                  new Paragraph({
                    text: paragraph.trim(),
                    spacing: {
                      after: 160, // 8pt after
                    },
                  })
                );
              }
            });
          } else {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: "No response generated",
                    italics: true,
                    color: "999999",
                  }),
                ],
                spacing: {
                  after: 200, // 10pt after
                },
              })
            );
          }
          
          // Add separator
          if (index < rfpItems.length - 1) {
            paragraphs.push(
              new Paragraph({
                text: "",
                border: {
                  bottom: {
                    color: "EEEEEE",
                    space: 12,
                    style: BorderStyle.SINGLE,
                    size: 6,
                  },
                },
                spacing: {
                  before: 300, // 15pt before
                  after: 300, // 15pt after
                },
              })
            );
          }
          
          return paragraphs;
        })
      ]
    });
  }
  
  // Create the document with all sections
  const doc = new Document({
    sections: sections
  });
  
  // Generate and return blob
  return await Packer.toBlob(doc);
};

/**
 * Downloads a generated DOCX file
 */
export const downloadDocxFile = async (
  items: ExcelRequirementResponse[],
  filename = "rfp-responses.docx"
): Promise<void> => {
  try {
    // Generate DOCX blob
    const blob = await generateDocxFile(items);
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    
    // Trigger a click on the anchor to start the download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error generating DOCX file:", error);
    throw error;
  }
};

/**
 * Generates a markdown string from a list of RFP responses
 * Format: RFP Name, Date, followed by each requirement and its response
 */
export const generateMarkdownContent = (
  items: ExcelRequirementResponse[]
): string => {
  if (!items.length) return "";

  // Group items by RFP Name for better organization
  const itemsByRfpName: Record<string, ExcelRequirementResponse[]> = {};

  items.forEach((item) => {
    const rfpName = item.rfpName || "Unnamed RFP";
    if (!itemsByRfpName[rfpName]) {
      itemsByRfpName[rfpName] = [];
    }
    itemsByRfpName[rfpName].push(item);
  });

  let markdownContent = "";

  // Process each RFP group
  Object.entries(itemsByRfpName).forEach(([rfpName, rfpItems]) => {
    // Add RFP header
    markdownContent += `# RFP Name - ${rfpName}\n\n`;
    
    // Add date (use the most recent timestamp from the items)
    const latestItem = [...rfpItems].sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA;
    })[0];
    
    if (latestItem?.timestamp) {
      const date = new Date(latestItem.timestamp).toLocaleDateString();
      markdownContent += `Date: ${date}\n\n`;
    } else {
      markdownContent += `Date: ${new Date().toLocaleDateString()}\n\n`;
    }

    // Add each requirement and its response
    rfpItems.forEach((item) => {
      // Add requirement
      markdownContent += `## ${item.category ? `${item.category}: ` : ""}${item.requirement || "No requirement text"}\n\n`;
      
      // Add response (if available)
      if (item.finalResponse) {
        markdownContent += `${item.finalResponse}\n\n`;
      } else {
        markdownContent += `*No response generated*\n\n`;
      }
      
      // Add separator for better readability
      markdownContent += "---\n\n";
    });
  });

  return markdownContent;
};

/**
 * Exports the markdown content as a downloadable file
 */
export const downloadMarkdownFile = (
  markdownContent: string,
  filename = "rfp-responses.md"
): void => {
  // Create a blob with the markdown content
  const blob = new Blob([markdownContent], { type: "text/markdown" });
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary anchor element
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  
  // Trigger a click on the anchor to start the download
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Strips markdown formatting from text to provide plain text for Excel export
 */
export const stripMarkdownFormatting = (text: string): string => {
  if (!text) return '';
  
  return text
    // Remove headers
    .replace(/^#+\s+(.+)$/gm, '$1')
    // Remove bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    // Remove bullet points and numbered lists but keep the content
    .replace(/^\s*[-*]\s+(.+)$/gm, '$1')
    .replace(/^\s*\d+\.\s+(.+)$/gm, '$1')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Replace links with just the text
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    // Replace code blocks with their content
    .replace(/```[a-z]*\n([\s\S]*?)\n```/gm, '$1')
    .replace(/`([^`]+)`/g, '$1')
    // Clean up excessive spacing
    .replace(/\n\n+/g, '\n\n')
    .trim();
};

/**
 * Generate a complete HTML email template for the responses
 */
export const generateHtmlEmailContent = (items: any[]): string => {
  if (!items.length) return "";

  // Group items by RFP Name
  const itemsByRfpName: Record<string, any[]> = {};
  items.forEach((item) => {
    const rfpName = item.rfpName || "Unnamed RFP";
    if (!itemsByRfpName[rfpName]) {
      itemsByRfpName[rfpName] = [];
    }
    itemsByRfpName[rfpName].push(item);
  });

  let htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>RFP Responses</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      .rfp-header {
        background-color: #f5f5f5;
        padding: 15px;
        margin-bottom: 20px;
        border-radius: 5px;
        border-left: 5px solid #4f46e5;
      }
      .rfp-title {
        font-size: 24px;
        margin: 0;
        color: #333;
      }
      .rfp-date {
        color: #666;
        margin-top: 5px;
      }
      .requirement {
        margin-bottom: 30px;
        border-bottom: 1px solid #eee;
        padding-bottom: 20px;
      }
      .requirement-header {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
        color: #4f46e5;
      }
      .requirement-category {
        font-size: 14px;
        color: #666;
        margin-bottom: 10px;
        font-style: italic;
      }
      .response {
        white-space: pre-line;
      }
      .no-response {
        color: #999;
        font-style: italic;
      }
    </style>
  </head>
  <body>
    <h1 style="text-align: center; margin-bottom: 30px; color: #4f46e5;">RFP Response Report</h1>
  `;

  // Process each RFP group
  Object.entries(itemsByRfpName).forEach(([rfpName, rfpItems]) => {
    // Get date from most recent item
    const latestItem = [...rfpItems].sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA;
    })[0];
    
    const date = latestItem?.timestamp
      ? new Date(latestItem.timestamp).toLocaleDateString()
      : new Date().toLocaleDateString();

    // Add RFP section
    htmlContent += `
    <div class="rfp-header">
      <h2 class="rfp-title">${rfpName}</h2>
      <div class="rfp-date">Date: ${date}</div>
    </div>
    `;

    // Add each requirement and response
    rfpItems.forEach((item) => {
      htmlContent += `
      <div class="requirement">
        <div class="requirement-header">${item.requirement || "No requirement text"}</div>
        ${item.category ? `<div class="requirement-category">Category: ${item.category}</div>` : ''}
        <div class="response">
          ${item.finalResponse 
            ? convertSimpleMarkdownToHtml(item.finalResponse) 
            : '<div class="no-response">No response generated</div>'}
        </div>
      </div>
      `;
    });
  });

  htmlContent += `
  </body>
  </html>
  `;

  return htmlContent;
};

/**
 * Convert simple markdown elements to HTML
 * This is a basic converter for the most common markdown elements
 */
export const convertSimpleMarkdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  
  return markdown
    // Replace headers
    .replace(/^# (.+)$/gm, '<h1 style="font-size: 22px; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size: 20px; font-weight: bold; margin-top: 18px; margin-bottom: 9px;">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size: 18px; font-weight: bold; margin-top: 16px; margin-bottom: 8px;">$1</h3>')
    .replace(/^#### (.+)$/gm, '<h4 style="font-size: 16px; font-weight: bold; margin-top: 14px; margin-bottom: 7px;">$1</h4>')
    
    // Replace bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    
    // Replace lists
    .replace(/^\s*-\s+(.+)$/gm, '<ul style="margin-top: 10px; margin-bottom: 10px;"><li>$1</li></ul>')
    .replace(/^\s*\*\s+(.+)$/gm, '<ul style="margin-top: 10px; margin-bottom: 10px;"><li>$1</li></ul>')
    .replace(/^\s*\d+\.\s+(.+)$/gm, '<ol style="margin-top: 10px; margin-bottom: 10px;"><li>$1</li></ol>')
    
    // Replace horizontal rules
    .replace(/^---$/gm, '<hr style="border: 0; height: 1px; background-color: #ddd; margin: 16px 0;">')
    
    // Replace links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: #4f46e5; text-decoration: underline;">$1</a>')
    
    // Replace paragraphs (two newlines)
    .replace(/\n\n/g, '</p><p>')
    
    // Wrap the content in a paragraph if it's not already
    .replace(/^(?!<h|<p|<ul|<ol|<hr|<div)(.+)$/gm, '<p>$1</p>')
    
    // Clean up any empty paragraphs
    .replace(/<p>\s*<\/p>/g, '')
    
    // Fix nested paragraphs in lists
    .replace(/<li><p>(.*?)<\/p><\/li>/g, '<li>$1</li>')
    
    // Replace consecutive closing and opening paragraph tags
    .replace(/<\/p><p>/g, '</p>\n<p>')
    
    // Wrap in a container div
    .replace(/^(.+)$/, '<div>$1</div>');
};

/**
 * Send email with markdown content using the default email client
 * This downloads the markdown file first, then opens the default email client
 */
export const sendEmailWithContent = (
  markdownContent: string,
  subject = "RFP Responses Export",
  to = ""
): void => {
  // First download the markdown file
  // This ensures the user has the content regardless of email client behavior
  downloadMarkdownFile(markdownContent, "rfp-responses.md");
  
  // Show notification about markdown download
  showNotification("Markdown file downloaded. Launching email client...", "success");
  
  // Open the default email client with the content
  openMailtoLink(markdownContent, subject, to);
};

/**
 * Helper function to show notifications
 * Optimized to support notification updating for better UX in long operations
 * @param message The notification message
 * @param type The type of notification (success, error, loading)
 * @param notificationId Optional ID to update an existing notification instead of creating a new one
 * @returns A unique ID that can be used to update this notification later
 */
const showNotification = (
  message: string, 
  type: "success" | "error" | "loading" = "success",
  notificationId?: number
): number => {
  // Get current notifications or create a new map
  const notifications = (window as any).__rfpNotifications = 
    (window as any).__rfpNotifications || new Map();
  
  // Generate a new ID if none was provided
  const id = notificationId || Date.now();
  
  // Store or update the notification
  notifications.set(id, { message, type, timestamp: Date.now() });
  
  // Log to console for debugging
  if (notificationId) {
    console.log(`[${type.toUpperCase()} - UPDATED #${id}] ${message}`);
  } else {
    console.log(`[${type.toUpperCase()} - NEW #${id}] ${message}`);
  }
  
  // For now, we'll use a simple alert for errors if there's no existing notification
  if (type === "error" && !notificationId) {
    // Show error alert in a nonblocking way
    setTimeout(() => alert(message), 0);
  }
  
  // Return the ID for future reference
  return id;
};

/**
 * Helper function to clear notifications
 */
const clearNotification = (id: number) => {
  // Implement notification clearing logic if your app has a toast system
  console.log(`Cleared notification ${id}`);
};

/**
 * Fallback method that opens the default mail client with the content as text email
 */
export const openMailtoLink = (
  markdownContent: string,
  subject = "RFP Responses Export",
  to = ""
): void => {
  // Create a mailto link with the markdown content in the body
  const emailBody = encodeURIComponent(markdownContent);
  
  const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${emailBody}`;
  
  // Open the mail client
  window.location.href = mailtoLink;
};

/**
 * Opens WhatsApp with the markdown content ready to share
 * Optimized to handle larger content more efficiently
 */
export const shareViaWhatsApp = (
  markdownContent: string
): void => {
  try {
    // First download the markdown file to ensure the user has a local copy
    // Use a try/catch within this operation to ensure the main function continues
    try {
      downloadMarkdownFile(markdownContent, "rfp-responses.md");
      showNotification("Markdown file downloaded. Launching WhatsApp...", "success");
    } catch (downloadErr) {
      console.warn("Unable to download markdown file, but continuing with WhatsApp share:", downloadErr);
    }
    
    // Prepare content for WhatsApp with performance optimization
    // WhatsApp has a character limit, so we'll truncate if necessary
    const MAX_LENGTH = 4000; // WhatsApp message character limit
    
    // Use substring directly instead of storing the entire content in a new variable
    const whatsAppText = markdownContent.length > MAX_LENGTH 
      ? markdownContent.substring(0, MAX_LENGTH - 150) + 
        "\n\n... (Content truncated due to length. Please refer to the downloaded markdown file for the complete content.)"
      : markdownContent;
    
    // Create WhatsApp sharing link - create it in a memory-efficient way
    // Use encodeURIComponent inside a requestAnimationFrame to prevent UI blocking
    requestAnimationFrame(() => {
      const whatsAppLink = `https://wa.me/?text=${encodeURIComponent(whatsAppText)}`;
      window.open(whatsAppLink, '_blank');
    });
  } catch (error) {
    console.error("Error sharing via WhatsApp:", error);
    // Use a more user-friendly message
    showNotification(`Couldn't share via WhatsApp. Please try downloading as a file instead.`, "error");
  }
};

/**
 * Generates an Excel file with RFP responses
 * Only includes Category, Requirement, and Final Response columns
 * Includes formatted header row and styled cells
 * Optimized for performance with large datasets
 */
export const generateExcelFile = (items: ExcelRequirementResponse[]): XLSX.WorkBook => {
  if (!items.length) {
    throw new Error("No items to export");
  }
  
  // Pre-allocate header styles to avoid recreating them for each cell
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { patternType: "solid", fgColor: { rgb: "4F46E5" } }, // Primary color background
    alignment: { horizontal: "center", vertical: "center", wrapText: true }
  };
  
  // Pre-allocate row styles
  const evenRowStyle = {
    alignment: { wrapText: true, vertical: "top" },
    fill: { patternType: "solid", fgColor: { rgb: "F5F5F5" } } // Light gray for even rows
  };
  
  const oddRowStyle = {
    alignment: { wrapText: true, vertical: "top" },
    fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } } // White for odd rows
  };
  
  // Create simplified data array with only the required columns 
  // Use a buffer size of 100 items at a time to avoid memory issues with large arrays
  const BUFFER_SIZE = 100;
  const bufferCount = Math.ceil(items.length / BUFFER_SIZE);
  
  // Create workbook first (outside the loop)
  const workbook = XLSX.utils.book_new();
  
  // Create worksheet with empty data first
  const worksheet = XLSX.utils.aoa_to_sheet([["Category", "Requirement", "Final Response"]]);
  
  // Set column widths (same as before)
  worksheet['!cols'] = [
    { wch: 15 },  // Category - 15 characters
    { wch: 30 },  // Requirement - 30 characters
    { wch: 100 }  // Final Response - 100 characters
  ];
  
  // Style header row (already added)
  const headerRange = XLSX.utils.decode_range("A1:C1");
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const headerCellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    worksheet[headerCellRef].s = headerStyle;
  }
  
  // Process data in chunks to avoid memory issues
  let currentRow = 1; // Start after header
  
  for (let bufferIndex = 0; bufferIndex < bufferCount; bufferIndex++) {
    const startIdx = bufferIndex * BUFFER_SIZE;
    const endIdx = Math.min(startIdx + BUFFER_SIZE, items.length);
    const chunk = items.slice(startIdx, endIdx);
    
    // Process each item in the chunk
    chunk.forEach((item, idx) => {
      const rowData = [
        item.category || "Uncategorized",
        item.requirement || "No requirement text",
        stripMarkdownFormatting(item.finalResponse || "No response")
      ];
      
      // Add this row to the worksheet
      for (let col = 0; col < rowData.length; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: col });
        worksheet[cellRef] = { v: rowData[col], t: 's' }; // 't' stands for 'type', 's' is string
        
        // Apply styles based on row index
        worksheet[cellRef].s = currentRow % 2 === 0 ? evenRowStyle : oddRowStyle;
      }
      
      currentRow++;
    });
  }
  
  // Update worksheet range reference
  worksheet['!ref'] = XLSX.utils.encode_range({ 
    s: { r: 0, c: 0 }, 
    e: { r: currentRow - 1, c: 2 } 
  });
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "RFP Responses");
  
  return workbook;
};

/**
 * Downloads an Excel file with RFP responses
 * Optimized to handle large datasets and prevent UI freezing
 */
export const downloadExcelFile = (
  items: ExcelRequirementResponse[],
  filename = "rfp-responses.xlsx"
): void => {
  // Show a loading notification to the user for better UX during large exports
  const notificationId = showNotification("Preparing Excel export...", "loading");
  
  // Use setTimeout to move the intensive operation off the main thread
  // This prevents UI freezing during large exports
  setTimeout(() => {
    try {
      // Generate workbook in the background thread
      const workbook = generateExcelFile(items);
      
      // Use requestAnimationFrame to ensure UI responsiveness during file writing
      requestAnimationFrame(() => {
        // Write workbook to file and trigger download
        XLSX.writeFile(workbook, filename);
        
        // Update notification on success
        showNotification("Excel file downloaded successfully!", "success", notificationId);
      });
    } catch (error) {
      console.error("Error generating Excel file:", error);
      
      // Update notification on error
      showNotification(
        `Failed to generate Excel file: ${error instanceof Error ? error.message : "Unknown error"}`, 
        "error", 
        notificationId
      );
    }
  }, 50); // Small delay to allow UI to update first
};