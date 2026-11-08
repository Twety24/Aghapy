import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/guard'
import { createAdminClient } from '@/lib/supabase/admin'

async function collectFiles(db,bucket,prefix=''){
  const files=[]
  let offset=0
  while(true){
    const{data,error}=await db.storage.from(bucket).list(prefix,{limit:1000,offset,sortBy:{column:'name',order:'asc'}})
    if(error)throw error
    if(!data?.length)break
    for(const item of data){
      const path=prefix?prefix+'/'+item.name:item.name
      if(item.id===null)files.push(...await collectFiles(db,bucket,path))
      else files.push(path)
    }
    if(data.length<1000)break
    offset+=data.length
  }
  return files
}

export async function POST(){
  if(!(await getAdmin()))return NextResponse.json({message:'مش مسموح.'},{status:403})
  const db=createAdminClient()
  const removed={}
  for(const bucket of ['avatars','gallery','meeting','reports']){
    const files=await collectFiles(db,bucket)
    for(let i=0;i<files.length;i+=1000){
      const{error}=await db.storage.from(bucket).remove(files.slice(i,i+1000))
      if(error)throw error
    }
    removed[bucket]=files.length
  }
  return NextResponse.json({ok:true,removed})
}
