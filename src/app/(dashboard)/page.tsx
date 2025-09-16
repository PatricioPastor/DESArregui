"use client"

import { useEffect } from "react"
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator"
import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"


export default function Page(){

    const router = useRouter()
    const {data, isPending} = useSession()

    useEffect(() => {
        if (!isPending) {
            if (!data?.user) {
                router.push('/login')
            } else {
                router.push('/soti')
            }
        }
    }, [data?.user, isPending, router])

    if(isPending){
        return <LoadingIndicator/>
    }

    return <></>
}
