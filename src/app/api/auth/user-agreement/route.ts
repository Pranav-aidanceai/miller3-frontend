import axios, { AxiosError } from 'axios';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
const API_URL = process.env.API_BASE_URL;

export async function GET() {
    try {

        const response = await axios.get(`${API_URL}/api/v1/tou`);

        return NextResponse.json({
            data: response.data
        }, {
            status: response.status || 200
        })

    } catch (error: unknown) {
        console.log("error", error)
        if (error instanceof AxiosError) {
            let errorData = error?.response?.data;
            if (typeof errorData === 'object') {
                errorData = JSON.stringify(errorData);
            }
            return NextResponse.json(
                { error: errorData || 'An error occurred' },
                {
                    status: error.response?.status || 500
                });
        } else if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, {
                status: 500
            });
        } else {
            return NextResponse.json({ error: error }, {
                status: 500
            });
        }
    }
}

export async function POST(request: Request) {
    try {

        const cookieStore = await cookies();
        const data = await request.json()
        const response = await axios.post(`${API_URL}/api/v1/auth/tou/accept`, {}, {
            headers: {
                Authorization: `Bearer ${cookieStore.get(
                    'access_token'
                )?.value}`,
            }
        });

        return NextResponse.json({
            data: response.data
        }, {
            status: response.status || 200
        })

    } catch (error: unknown) {
        console.log("error", error)
        if (error instanceof AxiosError) {
            let errorData = error?.response?.data;
            if (typeof errorData === 'object') {
                errorData = JSON.stringify(errorData);
            }
            return NextResponse.json(
                { error: errorData || 'An error occurred' },
                {
                    status: error.response?.status || 500
                });
        } else if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, {
                status: 500
            });
        } else {
            return NextResponse.json({ error: error }, {
                status: 500
            });
        }
    }
}