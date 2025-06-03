import { Link } from "react-router";
import { ValidRoutes } from "csc437-monorepo-backend/src/shared/ValidRoutes.ts";
import "./Header.css";

export function Header() {
    return (
        <header>
            <h1>My cool image site</h1>
            <div>
                <label>
                    Some switch (dark mode?) <input type="checkbox" />
                </label>
                <nav>
                    <Link to={ValidRoutes.HOME}>Home</Link>
                    <Link to={ValidRoutes.UPLOAD}>Upload</Link>
                    <Link to={ValidRoutes.LOGIN}>Log in</Link>
                </nav>
            </div>
        </header>
    );
}
