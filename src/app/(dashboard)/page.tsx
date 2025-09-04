"use client"

import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator"
import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"


export default function Page(){

    const router = useRouter()
    const {data, isPending} = useSession()

    if(isPending){
        return <LoadingIndicator/>
    }

    if(!data?.user){

        router.push('/login')
        return (<></>)
    }else{
        router.push('/soti')
        return <></>
    }
}
