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
 */
const showNotification = (message: string, type: "success" | "error" | "loading" = "success") => {
  // If your app has a toast/notification system, use it here
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // For now, we'll use a simple alert for errors
  if (type === "error") {
    alert(message);
  }
  
  // Return an ID that can be used to clear the notification
  return Date.now();
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
 * Generates an Excel file with RFP responses
 * Only includes Category, Requirement, and Final Response columns
 */
export const generateExcelFile = (items: ExcelRequirementResponse[]): XLSX.WorkBook => {
  if (!items.length) {
    throw new Error("No items to export");
  }
  
  // Create simplified data array with only the required columns and strip any markdown formatting
  const simplifiedData = items.map(item => ({
    Category: item.category || "Uncategorized",
    Requirement: item.requirement || "No requirement text",
    "Final Response": stripMarkdownFormatting(item.finalResponse || "No response")
  }));
  
  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(simplifiedData);
  
  // Set column widths for better readability
  const colWidths = [
    { wch: 20 },  // Category
    { wch: 40 },  // Requirement
    { wch: 70 }   // Final Response
  ];
  worksheet['!cols'] = colWidths;
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "RFP Responses");
  
  return workbook;
};

/**
 * Downloads an Excel file with RFP responses
 */
export const downloadExcelFile = (
  items: ExcelRequirementResponse[],
  filename = "rfp-responses.xlsx"
): void => {
  try {
    // Generate workbook
    const workbook = generateExcelFile(items);
    
    // Write workbook to file and trigger download
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error("Error generating Excel file:", error);
    alert(`Failed to generate Excel file: ${error instanceof Error ? error.message : String(error)}`);
  }
};