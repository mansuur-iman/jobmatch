import { profileSchema } from "../../validators/profile.validator";

describe("profileSchema", () => {
  it("accepts valid profile data", () => {
    const profile = profileSchema.safeParse({
      skills: ["JavaScript", "TypeScript"],
      university: "Example University",
      degree: "Bachelor's Degree",
      experience: { years: 5, companies: ["Company A", "Company B"] },
      projects: { project1: "Project A", project2: "Project B" },
      workEnvironment: "Remote",
      languages: ["English", "Spanish"],
      workLocation: "New York",
      jobLevel: "Senior",
      availability: "Full-time",
      roles: ["Developer", "Team Lead"],
      certifications: ["Certification A", "Certification B"],
    });

    expect(profile.success).toBe(true);
  });
  it("rejects invalid profile data", () => {
    const profile = profileSchema.safeParse({
      skills: ["J", "TypeScript"],
      university: "Example University",
      degree: "Bachelor's Degree",
      experience: "None",
      projects: { project1: "Project A", project2: "Project B" },
      workEnvironment: "Remote",
      languages: ["English", "Spanish"],
      workLocation: "New York",
      jobLevel: "Senior",
      availability: "Full-time",
      roles: ["Developer", "Team Lead"],
    });

    expect(profile.success).toBe(false);
  });
});
