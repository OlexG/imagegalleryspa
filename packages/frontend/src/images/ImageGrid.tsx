import { Link } from "react-router";
import { ValidRoutes } from "csc437-monorepo-backend/src/shared/ValidRoutes.ts";
import type { IApiImageData } from "csc437-monorepo-backend/src/common/ApiImageData.ts";
import "./Images.css";

interface IImageGridProps {
    images: IApiImageData[];
}

export function ImageGrid(props: IImageGridProps) {
    const imageElements = props.images.map((image) => (
        <div key={image._id} className="ImageGrid-photo-container">
            <Link to={`${ValidRoutes.IMAGES}/${image._id}`}>
                <img src={image.src} alt={image.name}/>
            </Link>
        </div>
    ));
    return (
        <div className="ImageGrid">
            {imageElements}
        </div>
    );
}
