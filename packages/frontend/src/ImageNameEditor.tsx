import { useState } from "react";

interface INameEditorProps {
    initialValue: string;
    imageId: string;
    authToken: string;
    updateImageName: (imageId: string, newName: string) => void;
}

export function ImageNameEditor(props: INameEditorProps) {
    const [isEditingName, setIsEditingName] = useState(false);
    const [input, setInput] = useState(props.initialValue);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmitPressed() {
        setIsSubmitting(true);
        setErrorMessage("");
        
        try {
            // Make PUT request to update image name
            const response = await fetch(`/api/images/${props.imageId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${props.authToken}`
                },
                body: JSON.stringify({ name: input })
            });
            
            if (!response.ok) {
                // Handle specific error cases from the backend
                if (response.status === 401) {
                    throw new Error("Authentication required. Please log in again.");
                } else if (response.status === 403) {
                    throw new Error("You can only edit your own images.");
                } else if (response.status === 404) {
                    throw new Error("Image not found.");
                } else if (response.status === 422) {
                    throw new Error("Image name exceeds 100 characters.");
                } else if (response.status === 400) {
                    throw new Error("Name field is required and must be a string.");
                } else {
                    throw new Error(`Failed to update image name. Status: ${response.status}`);
                }
            }
            
            // Update the image name in the parent state
            props.updateImageName(props.imageId, input);
            
            // Exit editing mode and clear error state
            setIsEditingName(false);
            setErrorMessage("");
        } catch (error) {
            console.error("Error updating image name:", error);
            setErrorMessage(error instanceof Error ? error.message : "Failed to update image name. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isEditingName) {
        return (
            <div style={{ margin: "1em 0" }}>
                <label>
                    New Name <input 
                        value={input} 
                        onChange={e => setInput(e.target.value)}
                        disabled={isSubmitting}
                    />
                </label>
                <button 
                    disabled={input.length === 0 || isSubmitting} 
                    onClick={handleSubmitPressed}
                >
                    Submit
                </button>
                <button 
                    onClick={() => setIsEditingName(false)}
                    disabled={isSubmitting}
                >
                    Cancel
                </button>
                {isSubmitting && <p style={{ color: "blue" }}>Working...</p>}
                {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
            </div>
        );
    } else {
        return (
            <div style={{ margin: "1em 0" }}>
                <button onClick={() => setIsEditingName(true)}>Edit name</button>
            </div>
        );
    }
} 