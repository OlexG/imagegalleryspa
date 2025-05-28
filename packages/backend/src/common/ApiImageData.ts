export interface IApiImageData {
    _id: string;
    src: string;
    name: string;
    author: IApiUserData;
}

export interface IApiUserData {
    _id: string,
    username: string
}