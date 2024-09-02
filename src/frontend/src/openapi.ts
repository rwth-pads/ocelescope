import { DefaultService, OpenAPI } from "@/src/api/generated/index";

OpenAPI.BASE = process.env.NEXT_PUBLIC_API_URL as string

export class Api extends DefaultService {

}
