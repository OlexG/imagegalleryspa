import { useState, useActionState, useId, useMemo, useEffect } from "react";

interface UploadFormData {
    file: File | null;
    name: string;
}

interface UploadActionResult {
    success: boolean;
    error?: string;
}

interface UploadPageProps {
    authToken: string;
    onUploadSuccess?: () => void;
}

// Helper function to convert a file to a data URL
function readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.readAsDataURL(file);
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = (err) => reject(err);
    });
}

async function uploadImage(authToken: string, _prevState: UploadActionResult | null, formData: FormData): Promise<UploadActionResult> {
    try {
        if (!authToken) {
            return { success: false, error: "Authentication required" };
        }

        const response = await fetch("/api/images", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${authToken}`
            },
            body: formData
        });

        if (!response.ok) {
            if (response.status === 401) {
                return { success: false, error: "Authentication required. Please log in again." };
            } else if (response.status === 404) {
                return { success: false, error: "Upload endpoint not found. Backend not implemented yet." };
            } else if (response.status === 413) {
                return { success: false, error: "File too large. Please choose a smaller image." };
            } else if (response.status === 422) {
                const errorData = await response.json();
                return { success: false, error: errorData.message || "Invalid file type. Please upload a PNG or JPEG image." };
            } else if (response.status >= 500) {
                return { success: false, error: "Server error. Please try again later." };
            } else {
                const errorData = await response.json();
                return { success: false, error: errorData.message || "Upload failed. Please try again." };
            }
        }

        return { success: true };
    } catch (error) {
        console.error("Upload error:", error);
        return { success: false, error: "Network error. Please check your connection and try again." };
    }
}

export function UploadPage({ authToken, onUploadSuccess }: UploadPageProps) {
    const [formData, setFormData] = useState<UploadFormData>({
        file: null,
        name: ""
    });
    
    // State for storing the preview data URL
    const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
    
    // Create a bound version of uploadImage with authToken pre-applied
    const boundUploadImage = useMemo(() => {
        return (prevState: UploadActionResult | null, formData: FormData) => 
            uploadImage(authToken, prevState, formData);
    }, [authToken]);
    
    const [uploadState, uploadAction, isUploading] = useActionState(boundUploadImage, null);
    
    // Generate unique IDs for accessibility
    const fileInputId = useId();
    const nameInputId = useId();

    // Call onUploadSuccess when upload is successful
    useEffect(() => {
        if (uploadState?.success && onUploadSuccess) {
            onUploadSuccess();
        }
    }, [uploadState?.success, onUploadSuccess]);

    // Handle file input change and generate preview
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        
        if (file) {
            try {
                // Convert file to data URL using the helper function
                const dataUrl = await readAsDataURL(file);
                
                // Update both file and preview state
                setFormData(prev => ({
                    ...prev,
                    file
                }));
                setPreviewDataUrl(dataUrl);
            } catch (error) {
                console.error("Error reading file:", error);
                setPreviewDataUrl(null);
            }
        } else {
            // Clear file and preview when no file selected
            setFormData(prev => ({
                ...prev,
                file: null
            }));
            setPreviewDataUrl(null);
        }
    };

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            name: event.target.value
        }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        if (!formData.file || !formData.name.trim()) {
            return;
        }

        const formDataToSend = new FormData();
        formDataToSend.append("image", formData.file);
        formDataToSend.append("name", formData.name.trim());

        uploadAction(formDataToSend);
    };

    return (
        <>
            <h2>Upload Image</h2>
            
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor={fileInputId}>Choose image to upload: </label>
                    <input
                        id={fileInputId}
                        name="image"
                        type="file"
                        accept=".png,.jpg,.jpeg"
                        required
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                </div>
                
                <div>
                    <label htmlFor={nameInputId}>
                        Image title: 
                        <input 
                            id={nameInputId}
                            name="name" 
                            required 
                            value={formData.name}
                            onChange={handleNameChange}
                            disabled={isUploading}
                            maxLength={100}
                        />
                    </label>
                </div>

                <div>
                    <img 
                        style={{ width: "20em", maxWidth: "100%" }} 
                        src={previewDataUrl || ""} 
                        alt="" 
                    />
                </div>

                <div>
                    <input 
                        type="submit" 
                        value={isUploading ? "Uploading..." : "Confirm upload"} 
                        disabled={isUploading || !formData.file || !formData.name.trim()}
                    />
                </div>
                
                {uploadState?.success && (
                    <div style={{ color: "green", marginTop: "1em" }} role="alert" aria-live="polite">
                        Success: Image uploaded successfully!
                    </div>
                )}
                
                {uploadState?.error && (
                    <div style={{ color: "red", marginTop: "1em" }} role="alert" aria-live="polite">
                        Error: {uploadState.error}
                    </div>
                )}
            </form>
        </>
    );
}
