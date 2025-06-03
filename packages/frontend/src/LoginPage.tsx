import React from "react";
import { Link, useNavigate } from "react-router";
import { ValidRoutes } from "csc437-monorepo-backend/src/shared/ValidRoutes.ts";
import "./LoginPage.css";

interface LoginPageProps {
    isRegistering?: boolean;
    onAuthSuccess: (authData: AuthResponse) => void;
}

interface FormState {
    error?: string;
}

interface AuthResponse {
    username: string;
    expirationDate: string;
    signature: string;
}

export function LoginPage({ isRegistering = false, onAuthSuccess }: LoginPageProps) {
    const usernameInputId = React.useId();
    const passwordInputId = React.useId();
    const navigate = useNavigate();

    // Helper function to make auth requests
    const makeAuthRequest = async (endpoint: string, username: string, password: string): Promise<Response> => {
        return fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });
    };

    // Helper function to handle error responses
    const handleErrorResponse = async (response: Response): Promise<string> => {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 409) {
            return "Username already taken. Please choose a different username.";
        } else if (response.status === 401) {
            return "Incorrect username or password.";
        } else if (response.status === 400) {
            return errorData.message || "Invalid username or password.";
        } else if (response.status >= 500) {
            return "Server error. Please try again later.";
        } else {
            return isRegistering ? "Registration failed. Please try again." : "Login failed. Please try again.";
        }
    };

    // Helper function to handle successful authentication
    const handleAuthenticationSuccess = (authData: AuthResponse) => {
        onAuthSuccess(authData);
        navigate(ValidRoutes.HOME);
    };

    // Registration function
    const handleRegistration = async (username: string, password: string): Promise<FormState> => {
        try {
            const response = await makeAuthRequest("/auth/register", username, password);

            if (response.ok) {
                const authData: AuthResponse = await response.json();
                console.log("Successfully created account and logged in");
                handleAuthenticationSuccess(authData);
                return {}; // Clear any previous errors
            } else {
                const errorMessage = await handleErrorResponse(response);
                return { error: errorMessage };
            }
        } catch (error) {
            console.error("Registration error:", error);
            return { error: "Network error. Please check your connection and try again." };
        }
    };

    // Login function
    const handleLogin = async (username: string, password: string): Promise<FormState> => {
        try {
            const response = await makeAuthRequest("/auth/login", username, password);

            if (response.ok) {
                const authData: AuthResponse = await response.json();
                console.log("Successfully logged in");
                handleAuthenticationSuccess(authData);
                return {}; // Clear any previous errors
            } else {
                const errorMessage = await handleErrorResponse(response);
                return { error: errorMessage };
            }
        } catch (error) {
            console.error("Login error:", error);
            return { error: "Network error. Please check your connection and try again." };
        }
    };

    const handleFormAction = async (_prevState: FormState, formData: FormData): Promise<FormState> => {
        const username = formData.get("username") as string;
        const password = formData.get("password") as string;

        console.log("Username:", username);
        console.log("Password:", password);

        if (isRegistering) {
            return handleRegistration(username, password);
        } else {
            return handleLogin(username, password);
        }
    };

    const [state, formAction, isPending] = React.useActionState(handleFormAction, {});

    return (
        <>
            <h2>{isRegistering ? "Register a new account" : "Login"}</h2>
            <form action={formAction} className="LoginPage-form">
                <label htmlFor={usernameInputId}>Username</label>
                <input 
                    id={usernameInputId} 
                    name="username" 
                    required 
                    disabled={isPending}
                />

                <label htmlFor={passwordInputId}>Password</label>
                <input 
                    id={passwordInputId} 
                    name="password" 
                    type="password" 
                    required 
                    disabled={isPending}
                />

                <input 
                    type="submit" 
                    value={isPending ? "Submitting..." : "Submit"} 
                    disabled={isPending}
                />
                
                {state.error && (
                    <div 
                        style={{ color: "red", marginTop: "10px" }} 
                        aria-live="polite"
                    >
                        {state.error}
                    </div>
                )}
            </form>
            {!isRegistering && (
                <p>
                    Don't have an account? <Link to={ValidRoutes.REGISTER}>Register here</Link>
                </p>
            )}
        </>
    );
}
