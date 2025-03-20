import React, { useState, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface Course {
  id: string;
  name: string;
  code: string;
}

const ChatManagement: React.FC = () => {
  const { createChatGroup } = useChat();
  const { getUserRole } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch courses if user is a lecturer
    if (getUserRole() !== 'lecturer') return;
    
    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        const coursesRef = collection(db, 'courses');
        const snapshot = await getDocs(coursesRef);
        const coursesList: Course[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          coursesList.push({
            id: doc.id,
            name: data.title || data.name || data.courseName || 'Unnamed Course',
            code: data.code || data.courseCode || 'No Code'
          });
        });
        setCourses(coursesList);
      } catch (error: any) {
        setError('Failed to load courses: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [getUserRole]);

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const course = courses.find(c => c.id === selectedCourse);
      if (!course) {
        throw new Error('Invalid course selected');
      }

      const groupName = course.name 
        ? `${course.name} (${course.code || ''})`
        : course.code || 'Unnamed Course';
      
      await createChatGroup(selectedCourse, groupName);
      setSuccessMessage('Chat group created successfully!');
      setSelectedCourse('');
    } catch (error: any) {
      setError('Failed to create chat group: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // If user is not a lecturer, don't show this component
  if (getUserRole() !== 'lecturer') {
    return null;
  }

  return (
    <div className="card">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">Create Course Chat Group</h5>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="alert alert-success" role="alert">
            {successMessage}
          </div>
        )}
        <form onSubmit={handleCreateChat}>
          <div className="mb-3">
            <label htmlFor="courseSelect" className="form-label">Select Course</label>
            <select
              id="courseSelect"
              className="form-select"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              required
            >
              <option value="">-- Select a course --</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name || course.code} {course.code ? `(${course.code})` : ''}
                </option>
              ))}
            </select>
            <div className="form-text">
              All students enrolled in this course will be automatically added to the chat.
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={isLoading || !selectedCourse}>
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creating...
              </>
            ) : (
              'Create Chat Group'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatManagement; 