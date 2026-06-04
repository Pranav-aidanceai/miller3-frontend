import axios, { AxiosError } from 'axios';
import { NextResponse } from 'next/server';
const API_URL = process.env.API_BASE_URL;

export async function POST(req: Request) {
    try {
        const data = await req.json();

        const payload = {
            email: data.email,
            new_password: data.new_password
        }

        const response = await axios.post(`${API_URL}/api/v1/auth/reset-password/complete`, payload);

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