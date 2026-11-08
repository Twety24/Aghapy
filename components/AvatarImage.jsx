'use client'
import {useState} from 'react'
export default function AvatarImage({src,alt,className}){
const [failed,setFailed]=useState(false)
return <img src={!src||failed?'/logo.jpg':src} alt={alt} onError={()=>setFailed(true)} className={className}/>
}
