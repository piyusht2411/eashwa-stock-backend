import { Types } from "mongoose";

export const headerMapping = {
  "Lead Date": "leadDate",
  "Calling Date": "callingDate",
  "Agent Name": "agentName",
  "Customer Name": "customerName",
  "Mobile No": "mobileNumber",
  Occupation: "occupation",
  Location: "location",
  Town: "town",
  State: "state",
  Status: "status",
  Remark: "remark",
  "Interested & Not Interested": "interestedAndNotInterested",
  "Office Visit Required": "officeVisitRequired",
};

export const validateLeadData = (data: any): boolean => {
  // Add specific validation for mobile number
  if (
    !data["Mobile No"] ||
    String(data["Mobile No"]).toLowerCase() === "undefined" ||
    String(data["Mobile No"]).trim() === ""
  ) {
    return false;
  }

  return Object.keys(headerMapping).every((header) => {
    const value = data[header];
    return value !== undefined && value !== null && value !== "";
  });
};

export const convertRowToLead = (row: any, userId: string) => {
  const mobileNo = row["Mobile No"];
  if (
    !mobileNo ||
    String(mobileNo).toLowerCase() === "undefined" ||
    String(mobileNo).trim() === ""
  ) {
    throw new Error("Invalid mobile number");
  }

  const cleanMobileNumber = String(mobileNo).replace(/[^0-9]/g, "");

  if (cleanMobileNumber.length < 10 || cleanMobileNumber.length > 15) {
    throw new Error("Invalid mobile number length");
  }

  return {
    leadDate: new Date(row["Lead Date"]),
    callingDate: new Date(row["Calling Date"]),
    agentName: String(row["Agent Name"]).trim(),
    customerName: String(row["Customer Name"]).trim(),
    mobileNumber: cleanMobileNumber,
    occupation: String(row["Occupation"]).trim(),
    location: String(row["Location"]).trim(),
    town: String(row["Town"]).trim(),
    state: String(row["State"]).trim(),
    status: String(row["Status"]).trim(),
    remark: String(row["Remark"]).trim(),
    interestedAndNotInterested: String(
      row["Interested & Not Interested"]
    ).trim(),
    officeVisitRequired:
      row["Office Visit Required"]?.toString().toLowerCase() === "yes" ||
      row["Office Visit Required"] === true ||
      row["Office Visit Required"] === 1,
    leadBy: new Types.ObjectId(userId),
    isTargetLead: false,
  };
};
