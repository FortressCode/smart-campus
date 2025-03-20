import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { useConfirm } from "../contexts/ConfirmContext";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { Email } from "../interfaces/Email";

const EmailService: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const { showNotification } = useNotification();
  const { showConfirm } = useConfirm();

  // Form states
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [emailHistory, setEmailHistory] = useState<Email[]>([]);
  const [selectedType, setSelectedType] = useState<"individual" | "group">("individual");
  const [students, setStudents] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");

  // Fetch students on component mount
  useEffect(() => {
    fetchStudents();
    fetchBranches();
    fetchEmailHistory();
  }, []);

  // Fetch all students
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student")
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsList = studentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || "Unknown",
        email: doc.data().email || "",
      }));
      setStudents(studentsList);
    } catch (error) {
      console.error("Error fetching students:", error);
      showNotification("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all branches
  const fetchBranches = async () => {
    try {
      const branchesQuery = query(collection(db, "branches"));
      const branchesSnapshot = await getDocs(branchesQuery);
      const branchesList = branchesSnapshot.docs.map((doc) => doc.data().name);
      setBranches(branchesList);
    } catch (error) {
      console.error("Error fetching branches:", error);
      // Use a default set of branches if fetching fails
      setBranches(["Computer Science", "Engineering", "Business", "Arts"]);
    }
  };

  // Fetch email history
  const fetchEmailHistory = async () => {
    if (!currentUser) return;
    
    try {
      const emailsQuery = query(
        collection(db, "emails"),
        where("senderEmail", "==", currentUser.email)
      );
      const emailsSnapshot = await getDocs(emailsQuery);
      const emailsList = emailsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate() || new Date(),
      })) as Email[];
      
      setEmailHistory(emailsList.sort((a, b) => {
        return (b.sentAt?.getTime() || 0) - (a.sentAt?.getTime() || 0);
      }));
    } catch (error) {
      console.error("Error fetching email history:", error);
      showNotification("Failed to load email history");
    }
  };

  // Handle student selection
  const handleStudentSelection = (studentId: string) => {
    setSelectedStudents((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  // Update recipients based on selection
  useEffect(() => {
    if (selectedType === "individual") {
      const selectedEmails = students
        .filter((student) => selectedStudents.includes(student.id))
        .map((student) => student.email);
      setRecipients(selectedEmails);
    } else if (selectedType === "group" && selectedBranch) {
      // In a real application, you would fetch students by branch
      // For now, we'll use a placeholder
      showNotification("Student emails for branch would be loaded here");
    }
  }, [selectedStudents, selectedType, selectedBranch, students]);

  // Handle sending email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !body.trim() || recipients.length === 0) {
      showNotification("Please fill in all fields and select recipients");
      return;
    }

    // Confirm before sending
    showConfirm(
      {
        title: "Confirm Send Email",
        message: `Are you sure you want to send this email to ${recipients.length} recipient(s)?`,
        confirmLabel: "Send",
        cancelLabel: "Cancel",
        variant: "info",
        icon: "bi-envelope",
      },
      async () => {
        try {
          setIsSending(true);
          
          // Create email record in Firestore
          const emailData: Omit<Email, "id"> = {
            subject,
            body,
            recipients,
            senderName: userData?.name || "Unknown",
            senderEmail: userData?.email || currentUser?.email || "",
            sentAt: new Date(),
            status: "sent"
          };
          
          await addDoc(collection(db, "emails"), {
            ...emailData,
            sentAt: serverTimestamp(),
          });
          
          showNotification(`Email sent to ${recipients.length} recipient(s)`);
          
          // Reset form
          setSubject("");
          setBody("");
          setSelectedStudents([]);
          setRecipients([]);
          
          // Refresh email history
          fetchEmailHistory();
        } catch (error) {
          console.error("Error sending email:", error);
          showNotification("Failed to send email");
        } finally {
          setIsSending(false);
        }
      }
    );
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleString();
  };

  return (
    <div className="email-service">
      <div className="dashboard-card mb-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h5 className="mb-0">Email Service</h5>
          <div>
            <button
              className={`btn btn-sm ${showHistory ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? "Compose Email" : "View History"}
            </button>
          </div>
        </div>

        {showHistory ? (
          <div className="email-history">
            <h6 className="mb-3">Email History</h6>
            {emailHistory.length === 0 ? (
              <div className="text-center py-4">
                <i className="bi bi-envelope fs-1 text-muted"></i>
                <p className="mt-3 text-muted">No emails have been sent yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Subject</th>
                      <th>Recipients</th>
                      <th>Sent At</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailHistory.map((email) => (
                      <tr key={email.id}>
                        <td>{email.subject}</td>
                        <td>{email.recipients.length} recipient(s)</td>
                        <td>{formatDate(email.sentAt || new Date())}</td>
                        <td>
                          <span
                            className={`badge ${
                              email.status === "sent"
                                ? "bg-success"
                                : email.status === "failed"
                                ? "bg-danger"
                                : "bg-warning"
                            }`}
                          >
                            {email.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSendEmail}>
            <div className="mb-3">
              <label className="form-label">Recipient Type</label>
              <div className="d-flex gap-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="recipientType"
                    id="individual"
                    checked={selectedType === "individual"}
                    onChange={() => setSelectedType("individual")}
                  />
                  <label className="form-check-label" htmlFor="individual">
                    Individual Students
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="recipientType"
                    id="group"
                    checked={selectedType === "group"}
                    onChange={() => setSelectedType("group")}
                  />
                  <label className="form-check-label" htmlFor="group">
                    Student Group
                  </label>
                </div>
              </div>
            </div>

            {selectedType === "individual" ? (
              <div className="mb-3">
                <label className="form-label">Select Students</label>
                {loading ? (
                  <div className="d-flex justify-content-center">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <div className="student-selection-container border rounded p-3" style={{ maxHeight: "200px", overflowY: "auto" }}>
                    {students.length === 0 ? (
                      <p className="text-muted text-center">No students found</p>
                    ) : (
                      students.map((student) => (
                        <div className="form-check mb-2" key={student.id}>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`student-${student.id}`}
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => handleStudentSelection(student.id)}
                          />
                          <label className="form-check-label" htmlFor={`student-${student.id}`}>
                            {student.name} ({student.email})
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {selectedStudents.length > 0 && (
                  <div className="mt-2 text-muted">
                    {selectedStudents.length} student(s) selected
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-3">
                <label className="form-label">Select Branch</label>
                <select
                  className="form-select"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                >
                  <option value="">Select a branch</option>
                  {branches.map((branch, index) => (
                    <option key={index} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-3">
              <label className="form-label">Subject</label>
              <input
                type="text"
                className="form-control"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Message</label>
              <textarea
                className="form-control"
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter your message"
                required
              ></textarea>
            </div>

            <div className="d-flex justify-content-end">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSending || recipients.length === 0}
              >
                {isSending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-2"></i>
                    Send Email
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EmailService; 