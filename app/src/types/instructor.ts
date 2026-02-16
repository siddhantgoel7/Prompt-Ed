export interface Instructor {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  // Add other fields as needed
}

export interface SignUpFormData {
  fullName: string;
  email: string;
  password: string;
  agreeToTerms: boolean;
}