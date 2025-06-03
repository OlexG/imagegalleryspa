import { useParams } from "react-router";
import type { IApiImageData } from "csc437-monorepo-backend/src/common/ApiImageData.ts";
import { ImageNameEditor } from "../ImageNameEditor.tsx";

interface IImageDetailsProps {
    images: IApiImageData[];
    isLoading: boolean;
    hasError: boolean;
    authToken: string;
    updateImageName: (imageId: string, newName: string) => void;
}

export function ImageDetails({ images, isLoading, hasError, authToken, updateImageName }: IImageDetailsProps) {
    const { imageId } = useParams<{ imageId: string }>();

    if (isLoading) {
        return <p>Loading image details...</p>;
    }

    if (hasError) {
        return <p>Error loading image details. Please try again later.</p>;
    }

    const image = images.find(image => image._id === imageId);
    
    if (!image) {
        return <h2>Image not found</h2>;
    }

    return (
        <>
            <h2>{image.name}</h2>
            <p>By {image.author.username}</p>
            <ImageNameEditor 
                initialValue={image.name} 
                imageId={image._id} 
                authToken={authToken}
                updateImageName={updateImageName} 
            />
            <img className="ImageDetails-img" src={image.src} alt={image.name} />
        </>
    )
}
