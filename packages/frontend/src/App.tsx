import { useState, useEffect, useRef } from "react";
import { Routes, Route } from "react-router";
import { ValidRoutes } from "csc437-monorepo-backend/src/shared/ValidRoutes.ts";
import type { IApiImageData } from "csc437-monorepo-backend/src/common/ApiImageData.ts";
import { MainLayout } from "./MainLayout.tsx";
import { AllImages } from "./images/AllImages.tsx";
import { ImageDetails } from "./images/ImageDetails.tsx";
import { UploadPage } from "./UploadPage.tsx";
import { LoginPage } from "./LoginPage.tsx";
import { ProtectedRoute } from "./ProtectedRoute.tsx";
import { ImageSearchForm } from "./images/ImageSearchForm.tsx";

interface AuthData {
    username: string;
    expirationDate: string;
    signature: string;
}

function App() {
    const [imageData, setImageData] = useState<IApiImageData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [searchString, setSearchString] = useState("");
    const requestNumberRef = useRef(0);

    const fetchImages = async (token: string, searchQuery?: string) => {
        // Increment request number and save current request number
        requestNumberRef.current += 1;
        const currentRequestNumber = requestNumberRef.current;

        setIsLoading(true);
        setHasError(false);
        
        try {
            // Build URL with search parameter if provided
            const url = searchQuery 
                ? `/api/images?search=${encodeURIComponent(searchQuery)}`
                : "/api/images";

            const response = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data: IApiImageData[] = await response.json();
            
            // Only update state if this is still the most recent request
            if (currentRequestNumber === requestNumberRef.current) {
                setImageData(data);
            }
        } catch (error) {
            console.error("Error fetching images:", error);
            // Only update error state if this is still the most recent request
            if (currentRequestNumber === requestNumberRef.current) {
                setHasError(true);
            }
        } finally {
            // Only update loading state if this is still the most recent request
            if (currentRequestNumber === requestNumberRef.current) {
                setIsLoading(false);
            }
        }
    };

    const handleAuthSuccess = (authData: AuthData) => {
        setAuthToken(authData.signature);
        console.log("Auth token set in App:", authData.signature);
        console.log("Full auth data:", authData);
        
        // Fetch images immediately after successful authentication
        fetchImages(authData.signature);
    };

    const handleImageSearch = () => {
        if (authToken) {
            // If search string is empty, fetch all images; otherwise, search with the query
            const query = searchString.trim() === "" ? undefined : searchString.trim();
            fetchImages(authToken, query);
        }
    };

    const handleUploadSuccess = () => {
        // Refresh images after successful upload
        if (authToken) {
            fetchImages(authToken);
        }
    };

    // Fetch images whenever authToken changes (if it exists)
    useEffect(() => {
        if (authToken) {
            fetchImages(authToken);
        }
    }, [authToken]);

    const updateImageName = (imageId: string, newName: string) => {
        setImageData(prevImages => 
            prevImages.map(image => 
                image._id === imageId 
                    ? { ...image, name: newName }
                    : image
            )
        );
    };

    const searchPanel = (
        <ImageSearchForm
            searchString={searchString}
            onSearchStringChange={setSearchString}
            onSearchRequested={handleImageSearch}
        />
    );

    return (
        <Routes>
            <Route path={ValidRoutes.HOME} element={<MainLayout />}>
                <Route index element={
                    <ProtectedRoute authToken={authToken}>
                        <AllImages 
                            images={imageData} 
                            isLoading={isLoading} 
                            hasError={hasError} 
                            searchPanel={searchPanel}
                        />
                    </ProtectedRoute>
                } />
                <Route path={ValidRoutes.UPLOAD.slice(1)} element={
                    <ProtectedRoute authToken={authToken}>
                        <UploadPage authToken={authToken || ""} onUploadSuccess={handleUploadSuccess} />
                    </ProtectedRoute>
                } />
                <Route path={ValidRoutes.LOGIN.slice(1)} element={<LoginPage onAuthSuccess={handleAuthSuccess} />} />
                <Route path={ValidRoutes.REGISTER.slice(1)} element={<LoginPage isRegistering={true} onAuthSuccess={handleAuthSuccess} />} />
                <Route path={`${ValidRoutes.IMAGES.slice(1)}/:imageId`} element={
                    <ProtectedRoute authToken={authToken}>
                        <ImageDetails 
                            images={imageData} 
                            isLoading={isLoading} 
                            hasError={hasError} 
                            authToken={authToken || ""} 
                            updateImageName={updateImageName} 
                        />
                    </ProtectedRoute>
                } />
            </Route>
        </Routes>
    );
}

export default App;
