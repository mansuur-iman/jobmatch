import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="container hero">
      <h1>Jobs that fit your profile, ranked for you.</h1>
      <p className="lead">
        Tell us your skills and experience once. We match you against fresh job listings every day
        and show the best fits first.
      </p>
      <div className="hero-actions">
        {isAuthenticated ? (
          <Link to="/recommendations" className="btn btn-primary btn-lg">
            View recommendations
          </Link>
        ) : (
          <>
            <Link to="/register" className="btn btn-primary btn-lg">
              Create your profile
            </Link>
            <Link to="/login" className="btn btn-ghost btn-lg">
              Log in
            </Link>
          </>
        )}
      </div>

      <div className="steps">
        <div className="card">
          <span className="step-num">1</span>
          <h3>Build your profile</h3>
          <p className="muted">Add your skills and a summary of your experience.</p>
        </div>
        <div className="card">
          <span className="step-num">2</span>
          <h3>Get matched daily</h3>
          <p className="muted">New jobs are compared against your profile every day.</p>
        </div>
        <div className="card">
          <span className="step-num">3</span>
          <h3>Track what you do</h3>
          <p className="muted">Mark roles as applied or dismiss the ones that aren't for you.</p>
        </div>
      </div>
    </div>
  );
}
