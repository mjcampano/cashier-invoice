import "../../styles/admin/addstudentmodal.css";

const AddStudent = ({
  closeModal,
  formData,
  handleChange,
  handleSubmit,
  editId
}) => {

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="form-modal" onClick={(e) => e.stopPropagation()}>

        <h3>{editId ? "Edit Student" : "Add Student"}</h3>

        <form className="student-form" onSubmit={handleSubmit}>

          <input 
            name="student_no" 
            placeholder="Student Number" 
            value={formData.student_no} 
            onChange={handleChange} 
          />

          <input 
            name="last_name" 
            placeholder="Last Name" 
            value={formData.last_name} 
            onChange={handleChange} 
          />

          <input 
            name="first_name" 
            placeholder="First Name" 
            value={formData.first_name} 
            onChange={handleChange} 
          />

          <input 
            name="middle_name" 
            placeholder="Middle Name" 
            value={formData.middle_name} 
            onChange={handleChange} 
          />

          <input 
            type="date" 
            name="birthdate" 
            value={formData.birthdate} 
            onChange={handleChange} 
          />

          <select 
            name="gender" 
            value={formData.gender} 
            onChange={handleChange}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <input 
            name="address" 
            placeholder="Address" 
            value={formData.address} 
            onChange={handleChange} 
          />

          <input 
            name="contact_no" 
            placeholder="Contact" 
            value={formData.contact_no} 
            onChange={handleChange} 
          />

          <input 
            name="email" 
            placeholder="Email" 
            value={formData.email} 
            onChange={handleChange} 
          />

          <input 
            name="password" 
            type="password"
            placeholder="Password" 
            value={formData.password} 
            onChange={handleChange} 
          />

          <input 
            name="course" 
            placeholder="Course" 
            value={formData.course} 
            onChange={handleChange} 
          />

          <button type="submit">
            {editId ? "Update Student" : "Add Student"}
          </button>

        </form>

        <button className="close-btn" onClick={closeModal}>
          Cancel
        </button>

      </div>
    </div>
  );
};

export default AddStudent;
