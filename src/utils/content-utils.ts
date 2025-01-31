import { getCollection } from 'astro:content'
import type { BlogPostData } from '@/types/config'
import I18nKey from '@i18n/i18nKey'
import { i18n } from '@i18n/translation'

export async function getSortedPosts(): Promise<
  { body: string, data: BlogPostData; slug: string }[]
> {
  const allBlogPosts = (await getCollection('posts', ({ data }) => {
    return import.meta.env.PROD ? data?.draft !== true : true
  })) as unknown as { body: string, data: BlogPostData; slug: string }[]

  let sorted = allBlogPosts.sort(
    (a: { data: BlogPostData }, b: { data: BlogPostData }) => {
      const dateA = new Date(a.data.published)
      const dateB = new Date(b.data.published)
      return dateA > dateB ? -1 : 1
    },
  )

  // 增加筛选，过滤掉系列并且为介绍的文章
  sorted = sorted.filter(({ data }) => {
    return !data?.introduce
  })

  for (let i = 1; i < sorted.length; i++) {
    sorted[i].data.nextSlug = sorted[i - 1].slug
    sorted[i].data.nextTitle = sorted[i - 1].data.title
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    sorted[i].data.prevSlug = sorted[i + 1].slug
    sorted[i].data.prevTitle = sorted[i + 1].data.title
  }

  return sorted
}

export type Tag = {
  name: string
  count: number
}

export async function getTagList(): Promise<Tag[]> {
  const allBlogPosts = await getCollection<'posts'>('posts', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true
  })

  const countMap: { [key: string]: number } = {}
  allBlogPosts.map((post: { data: { tags: string[] } }) => {
    post.data.tags.map((tag: string) => {
      if (!countMap[tag]) countMap[tag] = 0
      countMap[tag]++
    })
  })

  // sort tags
  const keys: string[] = Object.keys(countMap).sort((a, b) => {
    return a.toLowerCase().localeCompare(b.toLowerCase())
  })

  return keys.map(key => ({ name: key, count: countMap[key] }))
}

export type Category = {
  name: string
  count: number
}

export async function getCategoryList(): Promise<Category[]> {
  const allBlogPosts = await getCollection<'posts'>('posts', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true
  })
  const count: { [key: string]: number } = {}
  allBlogPosts.map((post: { data: { category: string | number } }) => {
    if (!post.data.category) {
      const ucKey = i18n(I18nKey.uncategorized)
      count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1
      return
    }
    count[post.data.category] = count[post.data.category]
      ? count[post.data.category] + 1
      : 1
  })

  const lst = Object.keys(count).sort((a, b) => {
    return a.toLowerCase().localeCompare(b.toLowerCase())
  })

  const ret: Category[] = []
  for (const c of lst) {
    ret.push({ name: c, count: count[c] })
  }
  return ret
}

export type Series = {
  name: string
  count: number
}

export async function getSeriesList() {
  const allBlogPosts = await getCollection<'posts'>('posts', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true
  })

  // 获取到简介数据
  let seriesData = allBlogPosts?.filter(({ data }) => {
    return data?.series && data?.introduce
  })

  // 将数据内容融合到简介里面
  return seriesData.map((post) => {
    // 找到同一分类下的所有系列文章
    let children = allBlogPosts.filter(({ data }) => 
      data.series && data.series === post.data.series && !data.introduce
    )

    children = children.sort(
      (a: { data: any }, b: { data: any }) => {
        const dateA = new Date(a.data.published)
        const dateB = new Date(b.data.published)
        return dateA < dateB ? -1 : 1
      },
    )
    
    return {
      ...post,
      data: {
        ...post.data,
        children
      }
    }
  })
}
