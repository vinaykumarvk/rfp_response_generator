--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: similar_questions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.similar_questions (
    id integer NOT NULL,
    requirement_id integer,
    similar_question text NOT NULL,
    similarity_score double precision,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.similar_questions OWNER TO neondb_owner;

--
-- Name: similar_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.similar_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.similar_questions_id_seq OWNER TO neondb_owner;

--
-- Name: similar_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.similar_questions_id_seq OWNED BY public.similar_questions.id;


--
-- Name: similar_questions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.similar_questions ALTER COLUMN id SET DEFAULT nextval('public.similar_questions_id_seq'::regclass);


--
-- Name: similar_questions similar_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.similar_questions
    ADD CONSTRAINT similar_questions_pkey PRIMARY KEY (id);


--
-- Name: similar_questions similar_questions_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.similar_questions
    ADD CONSTRAINT similar_questions_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.excel_requirements(id);


--
-- PostgreSQL database dump complete
--

